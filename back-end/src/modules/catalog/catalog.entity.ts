import { ApiProperty } from '@nestjs/swagger';

export class CatalogCategory {
  @ApiProperty({ example: 'home-cleaning' })
  id: string;

  @ApiProperty({ example: 'Home Cleaning' })
  name: string;

  @ApiProperty({ example: 'Cleaning services for homes', required: false })
  description?: string;

  @ApiProperty({ example: '🧹', required: false })
  icon?: string;

  @ApiProperty({ example: 'assets/images/home-cleaning/clean1.jpg', required: false })
  bgImage?: string;

  @ApiProperty({ example: ['Kitchen Cleaning', 'Bathroom Cleaning'] })
  subServices: string[];
}

export class CatalogProvider {
  @ApiProperty({ example: 'cleanpro-service' })
  id: string;

  @ApiProperty({ example: 'CleanPro Services' })
  name: string;

  @ApiProperty({ example: 'home-cleaning' })
  category: string;

  @ApiProperty({ example: ['Kitchen Cleaning', 'Bathroom Cleaning'] })
  subServices: string[];

  @ApiProperty({ example: 6 })
  years: number;

  @ApiProperty({ example: 4.8 })
  rating: number;

  @ApiProperty({ example: 245 })
  reviews: number;

  @ApiProperty({ example: '2.5 km' })
  distance: string;

  @ApiProperty({ example: 799 })
  startingPrice: number;

  @ApiProperty({ example: 'Chennai, Tamil Nadu' })
  location: string;

  @ApiProperty({ example: 520 })
  jobsDone: number;

  @ApiProperty({ example: true })
  availableToday: boolean;

  @ApiProperty({ example: true })
  verified: boolean;

  @ApiProperty({ example: 1 })
  cityId: number;

  @ApiProperty({ example: 'assets/images/home-cleaning/clean1.jpg' })
  image: string;

  @ApiProperty({ example: ['09:00 AM - 11:00 AM'], required: false })
  availabilitySlots?: string[];

  @ApiProperty({ example: 'PRO002', required: false })
  ownerProviderId?: string;

  @ApiProperty({ example: 'fresh@example.com', required: false })
  ownerProviderEmail?: string;
}

export class PopularService {
  @ApiProperty({ example: 'Kitchen Cleaning' })
  title: string;

  @ApiProperty({ example: 'Deep kitchen cleaning service', required: false })
  description?: string;

  @ApiProperty({ example: '₹799', required: false })
  price?: string;

  @ApiProperty({ example: 4.8, required: false })
  rating?: number;

  @ApiProperty({ example: 'home-cleaning' })
  categoryId: string;

  @ApiProperty({ example: 'assets/images/home-cleaning/clean1.jpg', required: false })
  image?: string;
}

export class CatalogState {
  @ApiProperty({ type: [CatalogCategory] })
  categories: CatalogCategory[];

  @ApiProperty({ type: [CatalogProvider] })
  providers: CatalogProvider[];

  @ApiProperty({ type: [PopularService] })
  popularServices: PopularService[];
}
